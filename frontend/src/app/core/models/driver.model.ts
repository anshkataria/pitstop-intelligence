export interface Driver {
  id: number;
  driverRef: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  dateOfBirth: string;
  wins: number;
  podiums: number;
  points: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
