import { uniqueSortedStaffIds } from './appointment-staff-ids.util';

describe('uniqueSortedStaffIds', () => {
  it('dedupes, drops blanks, and sorts to keep lock order stable', () => {
    expect(
      uniqueSortedStaffIds(['staff-b', null, 'staff-a', 'staff-b', undefined, '']),
    ).toEqual(['staff-a', 'staff-b']);
  });
});
