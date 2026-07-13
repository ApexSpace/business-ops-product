import {
  normalizeServiceLinesValue,
  parseServiceLinesFromHttpQuery,
} from './parse-service-lines-query.util';

describe('parse-service-lines-query.util', () => {
  it('parses JSON string query param', () => {
    const raw =
      '[{"serviceId":"66d762e5-4d8d-4c14-aec9-6a3c044b6e20","staffId":"937eb20a-7972-4a39-83ee-0228868114cf"}]';
    expect(normalizeServiceLinesValue(raw)).toEqual([
      {
        serviceId: '66d762e5-4d8d-4c14-aec9-6a3c044b6e20',
        staffId: '937eb20a-7972-4a39-83ee-0228868114cf',
      },
    ]);
  });

  it('parses express bracket object into ordered service lines', () => {
    expect(
      normalizeServiceLinesValue({
        '0': {
          serviceId: '66d762e5-4d8d-4c14-aec9-6a3c044b6e20',
          staffId: '937eb20a-7972-4a39-83ee-0228868114cf',
        },
        '1': {
          serviceId: '25495e83-a8e6-4b34-856c-f1188392d3f7',
          staffId: '0d383e99-13c1-44b3-82a3-e0b1c44d57b4',
        },
      }),
    ).toEqual([
      {
        serviceId: '66d762e5-4d8d-4c14-aec9-6a3c044b6e20',
        staffId: '937eb20a-7972-4a39-83ee-0228868114cf',
      },
      {
        serviceId: '25495e83-a8e6-4b34-856c-f1188392d3f7',
        staffId: '0d383e99-13c1-44b3-82a3-e0b1c44d57b4',
      },
    ]);
  });

  it('reads serviceLines from full http query', () => {
    expect(
      parseServiceLinesFromHttpQuery({
        from: '2026-07-10T19:00:00.000Z',
        serviceLines: {
          '0': {
            serviceId: '66d762e5-4d8d-4c14-aec9-6a3c044b6e20',
            staffId: '937eb20a-7972-4a39-83ee-0228868114cf',
          },
          '1': {
            serviceId: '25495e83-a8e6-4b34-856c-f1188392d3f7',
            staffId: '0d383e99-13c1-44b3-82a3-e0b1c44d57b4',
          },
        },
      }),
    ).toHaveLength(2);
  });
});
