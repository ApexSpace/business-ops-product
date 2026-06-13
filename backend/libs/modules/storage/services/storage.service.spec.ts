import { HttpStatus } from '@nestjs/common';
import {
  FileAssetStatus,
  FileCategory,
  FileVisibility,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const actor = { id: 'user-1', businessId: 'biz-1' } as never;

  const baseAsset = {
    id: 'file-1',
    businessId: 'biz-1',
    uploadedById: 'user-1',
    originalName: 'photo.png',
    filename: 'photo.png',
    mimeType: 'image/png',
    size: 1024,
    category: FileCategory.IMAGE,
    objectKey: 'businesses/biz-1/files/file-1-photo.png',
    status: FileAssetStatus.PENDING,
    visibility: FileVisibility.PRIVATE,
    metadata: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  function buildService() {
    const fileAssetRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdIncludingDeleted: jest.fn(),
      update: jest.fn(),
    };
    const fileAssetService = {
      validateUploadInput: jest.fn(),
      buildPendingAssetData: jest.fn(),
      getActiveAsset: jest.fn(),
      assertConfirmable: jest.fn(),
      assertFailAllowed: jest.fn(),
      assertDownloadable: jest.fn(),
      markReady: jest.fn(),
      markFailed: jest.fn(),
      softDelete: jest.fn(),
    };
    const r2StorageProvider = {
      createSignedUploadUrl: jest.fn(),
      createSignedDownloadUrl: jest.fn(),
      objectExists: jest.fn(),
      deleteObject: jest.fn(),
      isConfigured: jest.fn().mockReturnValue(true),
    };
    const auditService = { log: jest.fn() };

    const service = new StorageService(
      fileAssetRepository as never,
      fileAssetService as never,
      r2StorageProvider as never,
      auditService as never,
    );

    return {
      service,
      fileAssetRepository,
      fileAssetService,
      r2StorageProvider,
      auditService,
    };
  }

  const uploadDto = {
    filename: 'photo.png',
    mimeType: 'image/png',
    size: 1024,
    category: FileCategory.IMAGE,
    visibility: FileVisibility.PRIVATE,
  };

  it('create upload creates PENDING asset and signed URL', async () => {
    const {
      service,
      fileAssetRepository,
      fileAssetService,
      r2StorageProvider,
      auditService,
    } = buildService();

    fileAssetService.buildPendingAssetData.mockReturnValue({
      id: 'file-1',
      businessId: 'biz-1',
      uploadedById: 'user-1',
      originalName: 'photo.png',
      filename: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
      category: FileCategory.IMAGE,
      objectKey: baseAsset.objectKey,
      visibility: FileVisibility.PRIVATE,
    });
    fileAssetRepository.create.mockResolvedValue(baseAsset);
    r2StorageProvider.createSignedUploadUrl.mockResolvedValue({
      uploadUrl: 'https://r2.example/upload',
      expiresIn: 900,
    });

    const result = await service.createUpload('biz-1', uploadDto, actor);

    expect(fileAssetService.validateUploadInput).toHaveBeenCalledWith(uploadDto);
    expect(fileAssetRepository.create).toHaveBeenCalled();
    expect(result).toEqual({
      fileAssetId: 'file-1',
      uploadUrl: 'https://r2.example/upload',
      expiresIn: 900,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'file_asset.upload_created' }),
    );
  });

  it('confirm marks asset READY', async () => {
    const { service, fileAssetService, r2StorageProvider } = buildService();
    fileAssetService.getActiveAsset.mockResolvedValue(baseAsset);
    r2StorageProvider.objectExists.mockResolvedValue(true);
    fileAssetService.markReady.mockResolvedValue({
      ...baseAsset,
      status: FileAssetStatus.READY,
    });

    const result = await service.confirmUpload('biz-1', 'file-1', actor);

    expect(fileAssetService.assertConfirmable).toHaveBeenCalledWith(baseAsset);
    expect(fileAssetService.markReady).toHaveBeenCalledWith('file-1');
    expect(result.status).toBe(FileAssetStatus.READY);
  });

  it('fail marks asset FAILED', async () => {
    const { service, fileAssetService } = buildService();
    fileAssetService.getActiveAsset.mockResolvedValue(baseAsset);
    fileAssetService.markFailed.mockResolvedValue({
      ...baseAsset,
      status: FileAssetStatus.FAILED,
      metadata: { failReason: 'timeout' },
    });

    const result = await service.failUpload(
      'biz-1',
      'file-1',
      'timeout',
      actor,
    );

    expect(fileAssetService.markFailed).toHaveBeenCalledWith('file-1', 'timeout');
    expect(result.status).toBe(FileAssetStatus.FAILED);
  });

  it('get file returns same-business asset only via service guard', async () => {
    const { service, fileAssetService } = buildService();
    fileAssetService.getActiveAsset.mockResolvedValue(baseAsset);

    const result = await service.getFile('biz-1', 'file-1');

    expect(fileAssetService.getActiveAsset).toHaveBeenCalledWith(
      'biz-1',
      'file-1',
    );
    expect(result.id).toBe('file-1');
    expect(result).not.toHaveProperty('objectKey');
  });

  it('rejects cross-business access via NOT_FOUND', async () => {
    const { service, fileAssetService } = buildService();
    fileAssetService.getActiveAsset.mockRejectedValue(
      new AppException('NOT_FOUND' as never, 'File not found', HttpStatus.NOT_FOUND),
    );

    await expect(service.getFile('biz-2', 'file-1')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('download URL only for READY assets', async () => {
    const { service, fileAssetService, r2StorageProvider } = buildService();
    const readyAsset = { ...baseAsset, status: FileAssetStatus.READY };
    fileAssetService.getActiveAsset.mockResolvedValue(readyAsset);
    r2StorageProvider.createSignedDownloadUrl.mockResolvedValue({
      downloadUrl: 'https://r2.example/download',
      expiresIn: 300,
    });

    const result = await service.getDownloadUrl('biz-1', 'file-1');

    expect(fileAssetService.assertDownloadable).toHaveBeenCalledWith(readyAsset);
    expect(result).toEqual({
      downloadUrl: 'https://r2.example/download',
      expiresIn: 300,
    });
  });

  it('rejects download URL when asset is not READY', async () => {
    const { service, fileAssetService } = buildService();
    fileAssetService.getActiveAsset.mockResolvedValue(baseAsset);
    fileAssetService.assertDownloadable.mockImplementation(() => {
      throw new AppException(
        'BAD_REQUEST' as never,
        'File is not ready for download',
        HttpStatus.BAD_REQUEST,
      );
    });

    await expect(service.getDownloadUrl('biz-1', 'file-1')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('delete soft deletes asset', async () => {
    const { service, fileAssetService } = buildService();
    fileAssetService.getActiveAsset.mockResolvedValue(baseAsset);
    fileAssetService.softDelete.mockResolvedValue({
      ...baseAsset,
      status: FileAssetStatus.DELETED,
      deletedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const result = await service.deleteFile('biz-1', 'file-1', actor);

    expect(fileAssetService.softDelete).toHaveBeenCalledWith('file-1');
    expect(result.status).toBe(FileAssetStatus.DELETED);
  });

  it('rejects invalid mime during create via validation service', async () => {
    const { service, fileAssetService } = buildService();
    fileAssetService.validateUploadInput.mockImplementation(() => {
      throw new AppException(
        'BAD_REQUEST' as never,
        'MIME type not allowed',
        HttpStatus.BAD_REQUEST,
      );
    });

    await expect(
      service.createUpload(
        'biz-1',
        { ...uploadDto, mimeType: 'application/x-msdownload' },
        actor,
      ),
    ).rejects.toBeInstanceOf(AppException);
  });
});
