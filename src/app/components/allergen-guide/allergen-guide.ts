import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-allergen-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './allergen-guide.html'
})
export class AllergenGuide {
  allergens = [
    {
      name: 'Gluten / Wheat',
      note: 'Most of our breads, cakes, cookies, and brownies are made using wheat flour.'
    },
    {
      name: 'Eggs',
      note: 'Many of our bakes contain eggs. An eggless option is available on select items — look for the "Eggless" toggle on the product page, or ask us directly.'
    },
    {
      name: 'Dairy',
      note: 'Butter, milk, and cream are used across most of our menu, including fillings and frostings.'
    },
    {
      name: 'Nuts',
      note: 'Some items contain tree nuts or peanuts (e.g. in toppings, fillings, or garnishes). Please check with us before ordering if you have a nut allergy.'
    }
  ];
}