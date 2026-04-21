import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RedirectCommand, Route } from '@angular/router';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  imports: [CommonModule,ReactiveFormsModule],
  styleUrls: ['./login.css'],
  standalone: true
})
export class Login {

  
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router:Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

login() {
  
   
  if (this.form.invalid) return;

  this.auth.login(this.form.value).subscribe({
    next: (res: any) => {
      localStorage.setItem('token', res.access_token); //  FastAPI retorna "access_token"
      console.log('Login exitoso');
      this.router.navigate(['/dashboard']);
    },
    error: (err: any) => {
      console.error('Status:', err.status);
      console.error('Error:', err.error);
    }
  });
}
}