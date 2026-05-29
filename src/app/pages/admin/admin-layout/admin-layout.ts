import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type AdminNavItem = {
  path: string;
  label: string;
  icon: string;
};

type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayout {
  readonly sections: AdminNavSection[] = [
    {
      title: 'Operações',
      items: [
        { path: '/admin/pedidos', label: 'Pedidos', icon: 'receipt' },
        { path: '/admin/ofertas', label: 'Ofertas', icon: 'sell' },
        { path: '/admin/reformas', label: 'Reformas', icon: 'build' },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { path: '/admin/livros', label: 'Cadastrar livros', icon: 'menu_book' },
        { path: '/admin/estoque', label: 'Estoque', icon: 'inventory_2' },
      ],
    },
  ];
}
