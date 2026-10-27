import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class Blank {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'employees', component: Blank },
          { path: 'insights', component: Blank },
        ]),
      ],
    }).compileComponents();
  });

  it('shows the platform name in the toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const toolbar = (fixture.nativeElement as HTMLElement).querySelector('mat-toolbar');
    expect(toolbar?.textContent).toContain('ACME Salary Platform');
  });

  it('links to the employee directory and the insights page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/employees', '/insights']);
  });

  it('makes the brand title a link to the employee list, outside the nav links', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const brand = (fixture.nativeElement as HTMLElement).querySelector('mat-toolbar a.brand') as HTMLAnchorElement;
    expect(brand.textContent).toContain('ACME Salary Platform');
    expect(brand.getAttribute('href')).toBe('/employees');
    expect(brand.closest('nav')).toBeNull();
  });

  it('returns to the employee list when the brand title is clicked on another page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/insights');
    await fixture.whenStable();
    expect(router.url).toBe('/insights');

    ((fixture.nativeElement as HTMLElement).querySelector('a.brand') as HTMLAnchorElement).click();
    await fixture.whenStable();

    expect(router.url).toBe('/employees');
  });
});
