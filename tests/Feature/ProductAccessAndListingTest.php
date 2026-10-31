<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductAccessAndListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_and_edit_products_with_a_valid_margin(): void
    {
        $owner = User::factory()->create(['role' => UserRole::OWNER]);
        $category = Category::factory()->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/products', [
            'category_id' => $category->id,
            'name' => 'Desk lamp',
            'sale_price' => 150,
            'cost_price' => 100,
            'minimum_stock' => 2,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Desk lamp');

        $product = Product::query()->where('name', 'Desk lamp')->firstOrFail();

        $this->putJson("/api/products/{$product->id}", [
            'sale_price' => 175,
            'cost_price' => 125,
        ])->assertOk()
            ->assertJsonPath('data.sale_price', '175.00');

        $this->patchJson("/api/products/{$product->id}", ['active' => false])
            ->assertOk()
            ->assertJsonPath('data.active', false);

        $this->patchJson("/api/products/{$product->id}", [
            'sale_price' => 120,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('sale_price');

        $this->deleteJson("/api/products/{$product->id}")->assertNoContent();
    }

    public function test_employee_cannot_write_products_but_can_adjust_stock_and_register_sales(): void
    {
        $employee = User::factory()->create(['role' => UserRole::EMPLOYEE]);
        $category = Category::factory()->create();
        $product = Product::factory()->create(['category_id' => $category->id]);
        $product->forceFill(['current_stock' => 10])->save();
        Sanctum::actingAs($employee);

        $this->postJson('/api/products', [
            'category_id' => $category->id,
            'name' => 'New product',
            'sale_price' => 20,
            'cost_price' => 10,
            'minimum_stock' => 0,
        ])->assertForbidden();

        $this->putJson("/api/products/{$product->id}", ['name' => 'Updated name'])
            ->assertForbidden();
        $this->patchJson("/api/products/{$product->id}", ['active' => false])
            ->assertForbidden();
        $this->deleteJson("/api/products/{$product->id}")
            ->assertForbidden();

        $this->postJson("/api/products/{$product->id}/stock-adjustments", [
            'quantity' => 1,
            'reason' => 'Inventory count correction',
        ])->assertOk();

        $saleResponse = $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ])->assertCreated();

        $saleId = $saleResponse->json('data.id');
        $this->postJson("/api/sales/{$saleId}/cancel")->assertForbidden();
    }

    public function test_product_listing_filters_paginates_and_limits_inactive_override_to_owners(): void
    {
        $category = Category::factory()->create();
        $otherCategory = Category::factory()->create();
        $active = Product::factory()->create([
            'category_id' => $category->id,
            'name' => 'Alpha active',
        ]);
        $inactive = Product::factory()->create([
            'category_id' => $category->id,
            'name' => 'Alpha inactive',
        ]);
        $inactive->forceFill(['active' => false])->save();
        Product::factory()->create([
            'category_id' => $otherCategory->id,
            'name' => 'Alpha other category',
        ]);

        $owner = User::factory()->create(['role' => UserRole::OWNER]);
        Sanctum::actingAs($owner);

        $ownerResponse = $this->getJson('/api/products?search=Alpha&category_id='.$category->id.'&per_page=1&include_inactive=true')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonCount(1, 'data');

        $this->assertArrayHasKey('cost_price', $ownerResponse->json('data.0'));

        $this->getJson('/api/products?search=Alpha&category_id='.$category->id.'&include_inactive=false')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $active->id);

        $employee = User::factory()->create(['role' => UserRole::EMPLOYEE]);
        Sanctum::actingAs($employee);

        $employeeResponse = $this->getJson('/api/products?search=Alpha&category_id='.$category->id.'&include_inactive=true')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data');

        $this->assertArrayNotHasKey('cost_price', $employeeResponse->json('data.0'));
    }

    public function test_product_listing_rejects_invalid_filter_values(): void
    {
        $employee = User::factory()->create(['role' => UserRole::EMPLOYEE]);
        Sanctum::actingAs($employee);

        $this->getJson('/api/products?per_page=101')->assertUnprocessable();
        $this->getJson('/api/products?category_id=999999')->assertUnprocessable();
        $this->getJson('/api/products?include_inactive=maybe')->assertUnprocessable();
    }

    public function test_product_resource_includes_null_cost_only_for_owner(): void
    {
        $product = new Product(['cost_price' => null]);
        $ownerRequest = Request::create('/api/products');
        $ownerRequest->setUserResolver(fn () => User::factory()->make(['role' => UserRole::OWNER]));
        $employeeRequest = Request::create('/api/products');
        $employeeRequest->setUserResolver(fn () => User::factory()->make(['role' => UserRole::EMPLOYEE]));

        $ownerData = (new ProductResource($product))->resolve($ownerRequest);
        $employeeData = (new ProductResource($product))->resolve($employeeRequest);

        $this->assertArrayHasKey('cost_price', $ownerData);
        $this->assertNull($ownerData['cost_price']);
        $this->assertArrayNotHasKey('cost_price', $employeeData);
    }
}
