import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { EmployeeForm } from './employees/employee-form/employee-form';
import { EmployeeList } from './employees/employee-list/employee-list';
import { InsightsPage } from './insights/insights-page/insights-page';

describe('routes', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // The pages load data on start; the testing backend keeps these tests off the network.
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    harness = await RouterTestingHarness.create();
  });

  it('redirects the root path to the employee directory', async () => {
    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/employees');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(EmployeeList);
  });

  it('shows the employee directory at /employees', async () => {
    const component = await harness.navigateByUrl('/employees');

    expect(component).toBeInstanceOf(EmployeeList);
  });

  it('shows the employee form at /employees/new', async () => {
    const component = await harness.navigateByUrl('/employees/new');

    expect(component).toBeInstanceOf(EmployeeForm);
  });

  it('shows the employee form at /employees/:id/edit', async () => {
    const component = await harness.navigateByUrl('/employees/5/edit');

    expect(component).toBeInstanceOf(EmployeeForm);
  });

  it('shows the insights page at /insights', async () => {
    const component = await harness.navigateByUrl('/insights');

    expect(component).toBeInstanceOf(InsightsPage);
  });
});
