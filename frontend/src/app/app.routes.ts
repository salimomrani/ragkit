import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
  },
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chat/chat').then((m) => m.Chat),
  },
  {
    path: 'ingest',
    canActivate: [authGuard],
    loadComponent: () => import('./components/ingest/ingest').then((m) => m.Ingest),
  },
  {
    path: 'logs',
    canActivate: [authGuard],
    loadComponent: () => import('./components/logs/logs').then((m) => m.Logs),
  },
  {
    path: 'eval',
    canActivate: [authGuard],
    loadComponent: () => import('./components/eval/eval').then((m) => m.Eval),
  },
];
