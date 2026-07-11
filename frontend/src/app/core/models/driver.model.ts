export interface Driver {
  id: number;
  driverRef: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  dateOfBirth: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
