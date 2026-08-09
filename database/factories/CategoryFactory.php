<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
                'name' => fake()->unique()->randomElement([
                'Beverages',
                'Dairy',
                'Bakery',
                'Frozen Foods',
                'Snacks',
                'Cleaning',
                'Personal Care',
                'Household',
                'Canned Goods',
                'Condiments',
                'Pasta and Rice',
                'Pet Supplies',
            ]),
        ];
    }
}
