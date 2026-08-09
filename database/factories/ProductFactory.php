<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $costPrice = fake()->randomFloat(2, 100, 10000);
        $salePrice = fake()->randomFloat(2, $costPrice, $costPrice * 1.6);

        return [
            'category_id' => Category::query()->inRandomOrder()->value('id'),
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'sale_price' => $salePrice,
            'cost_price' => $costPrice,
            'minimum_stock' => fake()->numberBetween(0, 20),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Product $product) {
            $product->forceFill([
                'current_stock' => fake()->numberBetween(0, 200),
                'active' => true,
            ])->save();
        });
    }
}
