<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegisterSaleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::EMPLOYEE]));
    }

    public function test_it_registers_a_sale_and_returns_the_authoritative_total(): void
    {
        $product = $this->createProduct(stock: 8, salePrice: '12.50');

        $response = $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.total', '25.00');

        $this->assertDatabaseCount('sales', 1);
        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => '12.50',
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'current_stock' => 6,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'quantity' => -2,
            'type' => 'sale',
        ]);
    }

    public function test_insufficient_stock_returns_a_structured_conflict_and_rolls_back_every_item(): void
    {
        $availableProduct = $this->createProduct(stock: 5);
        $shortProduct = $this->createProduct(stock: 1);

        $response = $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $shortProduct->id, 'quantity' => 2],
                ['product_id' => $availableProduct->id, 'quantity' => 3],
            ],
        ]);

        $response
            ->assertConflict()
            ->assertJsonPath('code', 'insufficient_stock')
            ->assertJsonPath('product_id', $shortProduct->id);

        $this->assertDatabaseCount('sales', 0);
        $this->assertDatabaseCount('sale_items', 0);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertDatabaseHas('products', [
            'id' => $availableProduct->id,
            'current_stock' => 5,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $shortProduct->id,
            'current_stock' => 1,
        ]);
    }

    public function test_inactive_product_returns_a_structured_conflict(): void
    {
        $product = $this->createProduct(stock: 8, active: false);

        $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ])
            ->assertConflict()
            ->assertJsonPath('code', 'product_inactive')
            ->assertJsonPath('product_id', $product->id);

        $this->assertDatabaseCount('sales', 0);
        $this->assertDatabaseCount('sale_items', 0);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'current_stock' => 8,
        ]);
    }

    public function test_duplicate_products_return_an_indexed_validation_error(): void
    {
        $product = $this->createProduct(stock: 8);

        $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items.1.product_id');

        $this->assertDatabaseCount('sales', 0);
        $this->assertDatabaseCount('sale_items', 0);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'current_stock' => 8,
        ]);
    }

    private function createProduct(
        int $stock,
        string $salePrice = '10.00',
        bool $active = true,
    ): Product {
        $product = Product::factory()
            ->for(Category::factory())
            ->create([
                'sale_price' => $salePrice,
                'active' => $active,
            ]);

        $product->forceFill([
            'current_stock' => $stock,
            'active' => $active,
        ])->save();

        return $product->fresh();
    }
}
