import {
  FileAssetStatus,
  FileCategory,
  FileVisibility,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { FileAssetService } from './file-asset.service';
import { StoragePathService } from './storage-path.service';

describe('FileAssetService', () => {
  function buildService() {
    const fileAssetRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    const storagePathService = new StoragePathService();
    const service = new FileAssetService(
      fileAssetRepository as never,
      storagePathService,
    );
    return { service, fileAssetRepository, storagePathService };
  }

  const validDto = {
    filename: 'photo.png',
    mimeType: 'image/png',
    size: 1024,
    category: FileCategory.IMAGE,
    visibility: FileVisibility.PRIVATE,
  };

  it('rejects invalid mime type', () => {
    const { service } = buildService();
    expect(() =>
      service.validateUploadInput({
        ...validDto,
        mimeType: 'application/x-msdownload',
      }),
    ).toThrow(AppException);
  });

  it('rejects oversized files', () => {
    const { service } = buildService();
    expect(() =>
      service.validateUploadInput({
        ...validDto,
        size: 26 * 1024 * 1024,
      }),
    ).toThrow(AppException);
  });

  it('rejects category and mime mismatch', () => {
    const { service } = buildService();
    expect(() =>
      service.validateUploadInput({
        ...validDto,
        category: FileCategory.PDF,
      }),
    ).toThrow(AppException);
  });

  it('builds object key with sanitized filename', () => {
    const { service } = buildService();
    const data = service.buildPendingAssetData(
      'biz-1',
      'user-1',
      { ...validDto, filename: 'my file (1).png' },
      'asset-1',
    );

    expect(data.objectKey).toBe(
      'businesses/biz-1/files/asset-1-my_file_1_.png',
    );
    expect(data.filename).toBe('my_file_1_.png');
  });

  it('throws NOT_FOUND for missing asset', async () => {
    const { service, fileAssetRepository } = buildService();
    fileAssetRepository.findById.mockResolvedValue(null);

    await expect(service.getActiveAsset('biz-1', 'missing')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('rejects download when status is not READY', () => {
    const { service } = buildService();
    expect(() =>
      service.assertDownloadable({
        status: FileAssetStatus.PENDING,
      } as never),
    ).toThrow(AppException);
  });
});
