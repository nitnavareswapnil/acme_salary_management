import { environment } from './environment';
import { environment as development } from './environment.development';

describe('environment', () => {
  it('points the API base URL at the local backend by default', () => {
    expect(environment.apiBaseUrl).toBe('http://localhost:8080/api');
    expect(development.apiBaseUrl).toBe('http://localhost:8080/api');
  });
});
