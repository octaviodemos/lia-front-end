import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {

  isDropdownOpen = false;

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onSearch(): void {
    console.log('Buscando...');
  }
}