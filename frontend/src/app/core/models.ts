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
