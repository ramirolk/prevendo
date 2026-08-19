<?php

namespace App\Http\Controllers;

use App\Enums\StockMovementType;
use App\Exceptions\NegativeStockException;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\StoreStockAdjustmentRequest;
use App\Http\Requests\UpdateProductRequest;

use App\Http\Resources\ProductResource;

use App\Models\Product;
use App\Models\StockMovement;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $products = Product::paginate($request->input('per_page', 15));

        return ProductResource::collection($products);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProductRequest $request)
    {
        $product = Product::create([
            'category_id' => $request->validated('category_id'),
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'sale_price' => $request->validated('sale_price'),
            'cost_price' => $request->validated('cost_price'),
            'minimum_stock' => $request->validated('minimum_stock'),
        ]);

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        return new ProductResource($product);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        return new ProductResource($product->fresh());
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        try {
            $product->delete();

            return response()->json([
                'message' => 'Product deleted successfully.'
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->errorInfo[1] === 1451) {
                $product->forceFill(['active' => false])->save();

                return response()->json([
                    'message' => 'Product has sales history and cannot be deleted. It has been deactivated instead.',
                ], 200);
            }

            throw $e;
            }
    }

    public function storeStockAdjustment(StoreStockAdjustmentRequest $request, Product $product)
    {
        try {
            DB::transaction(function () use ($request, $product){
                $product = Product::where('id', $product->id)
                    ->lockForUpdate()
                    ->first();
                
                $newStock = $product->current_stock + $request->validated('quantity');

                if ($newStock < 0) {
                    throw new NegativeStockException(
                        "Adjustment would result in negative stock for product {$product->name}."
                    );
                }

                $product->forceFill(['current_stock' => $newStock])->save();

                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => StockMovementType::ADJUSTMENT,
                    'quantity' => $request->validated('quantity'),
                    'reason' => $request->validated('reason'),
                ]);   
            });

            return response()->json([
                'message' => 'Stock adjusted successfully.',
            ], 200);
        } catch (NegativeStockException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 409);
        }
    }
}
