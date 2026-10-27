// Mirrors the backend DTO records. Salaries arrive as JSON numbers; two decimals fit a double exactly enough for display.
export type Country = 'US' | 'INDIA' | 'UK';

export const COUNTRY_LABELS: Record<Country, string> = {
  US: 'United States',
  INDIA: 'India',
  UK: 'United Kingdom',
};

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  country: Country;
  currency: string;
  baseSalary: number;
}

// Body of POST/PUT /employees; the id and currency are assigned or derived by the backend.
export interface EmployeeRequest {
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  country: Country;
  baseSalary: number;
}

// The backend's single error body for every failure.
export interface ApiError {
  status: number;
  message: string;
  errors: { field: string; message: string }[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface EmployeeQuery {
  search?: string;
  country?: Country | '';
  department?: string;
  // Only meaningful together with a country: salaries in different currencies are never compared.
  minSalary?: number | null;
  maxSalary?: number | null;
  page: number;
  size: number;
}

export interface CountrySalaryStats {
  country: Country;
  currency: string;
  minSalary: number;
  maxSalary: number;
  avgSalary: number;
  employeeCount: number;
}

export interface JobTitleAverage {
  jobTitle: string;
  avgSalary: number;
  employeeCount: number;
}

export interface DepartmentAverage {
  department: string;
  avgSalary: number;
  employeeCount: number;
}

// One country's average for a job title, or null when nobody in that country holds the role.
export interface JobTitleComparison {
  country: Country;
  average: JobTitleAverage | null;
}
