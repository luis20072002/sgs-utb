import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuxiliarDashboard } from './auxiliar-dashboard';

describe('AuxiliarDashboard', () => {
  let component: AuxiliarDashboard;
  let fixture: ComponentFixture<AuxiliarDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuxiliarDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(AuxiliarDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
