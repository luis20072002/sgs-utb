import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KPIStats } from '../../../models/edu.models';
 
@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'charts.html',
  styleUrls: ['charts.css']
})
export class ChartsComponent implements OnInit {
  @Input() stats!: KPIStats;
 
  chartData: { label: string; value: number; color: string; pct: number }[] = [];
 
  ngOnInit(): void {
    if (!this.stats) return;
    const total = this.stats.totalUsers;
    this.chartData = [
      { label: 'Usuarios totales',        value: this.stats.totalUsers,                color: '#3B82F6', pct: 100 },
      { label: 'Docentes',                value: this.stats.totalDocentes,             color: '#10B981', pct: Math.round(this.stats.totalDocentes / total * 100) },
      { label: 'Auxiliares',              value: this.stats.totalAuxiliares,           color: '#F59E0B', pct: Math.round(this.stats.totalAuxiliares / total * 100) },
      { label: 'Reportes enviados',       value: this.stats.totalReports,              color: '#8B5CF6', pct: Math.round(this.stats.totalReports / total * 100) },
      { label: 'Proyectores con falla',   value: this.stats.totalProyectoresFallando,  color: '#EF4444', pct: Math.round(this.stats.totalProyectoresFallando / total * 100) },
    ];
  }
}