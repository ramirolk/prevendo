<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Http\Resources\SaleResource;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Models\StockMovement;

use App\Exceptions\InsufficientStockException;
use App\Exceptions\ProductInactiveException;
use App\Exceptions\SaleAlreadyCancelledException;

use App\Enums\StockMovementType;
use App\Enums\SaleStatus;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index()
    {
        //
    }

    public function store(StoreSaleRequest $request)
    {
        try{
        
            $sale = DB::transaction(function() use ($request) {
            
                $sale = new Sale();
                
                $sale->forceFill([
                    'user_id' => $request->user()->id,
                    'total' => 0,
                ]);
                
                $sale->save();

                $total = 0;

                $items = collect($request->validated('items'))
                        ->sortBy('product_id')
                        ->values();
                
                foreach ($items as $item) {

                    $product = Product::where('id', $item['product_id'])
                        ->lockForUpdate()
                        ->first();
                    
                    if (! $product->active) {
                        throw new ProductInactiveException(
                            "Product {$product->name} is inactive."
                        );
                    }

                    if ($product->current_stock < $item['quantity']) {
                        throw new InsufficientStockException(
                            "Insufficient stock for product {$product->name}."
                        );
                    }

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                        'unit_price' => $product->sale_price,
                    ]);

                    $product->forceFill([
                        'current_stock' => $product->current_stock - $item['quantity'],
                    ])->save();

                    StockMovement::create([
                        'product_id' => $product->id,
                        'sale_id' => $sale->id,
                        'user_id' => $request->user()->id,
                        'type' => StockMovementType::SALE,
                        'quantity' => -$item['quantity'], 
                    ]);

                    $total += $product->sale_price * $item['quantity'];
                }

                $sale->forceFill([
                    'total' => $total,
                ])->save();

                return $sale;
            });

        } catch (InsufficientStockException | ProductInactiveException $e) {

            return response()->json([
                'message' => $e->getMessage(),
            ], 409);
        }

        return (new SaleResource($sale))
            ->response()
            ->setStatusCode(201);
    }

    public function cancel(Request $request, Sale $sale)
    {
        try {
            DB::transaction(function() use ($request, $sale) {

                $sale = Sale::where('id', $sale->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                if ($sale->status === SaleStatus::CANCELLED) {
                    throw new SaleAlreadyCancelledException();
                }

                foreach ($sale->items as $item) {
                    $product = Product::where('id', $item->product_id)
                        ->lockForUpdate()
                        ->firstOrFail();
                    
                    $product->forceFill([
                        'current_stock' => $product->current_stock + $item->quantity,
                    ])->save();

                    StockMovement::create([
                        'product_id' => $product->id,
                        'type' => StockMovementType::CANCELLATION,
                        'quantity' => $item->quantity,
                        'sale_id' => $sale->id,
                        'user_id' => $request->user()->id,
                    ]);
                }

                $sale->forceFill([
                    'status' => SaleStatus::CANCELLED,
                ])->save();
            });

            return response()->json([
                'message' => 'Sale cancelled successfully.',
            ], 200);

        } catch (SaleAlreadyCancelledException $e) {
            return response()->json([
                'message' => 'Sale has already been cancelled.',
            ], 409);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
