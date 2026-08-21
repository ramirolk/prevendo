<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Products
    Route::apiResource('products', ProductController::class)->except(['destroy']);

    Route::delete('/products/{product}', [ProductController::class, 'destroy'])
        ->middleware('role:owner');

    Route::post('/products/{product}/stock-adjustments', [ProductController::class, 'storeStockAdjustment']);

    // Sales
    Route::apiResource('sales', SaleController::class);

    Route::post('/sales/{sale}/cancel',[SaleController::class, 'cancel'])
        ->middleware('role:owner');
    
    //LowStock
    Route::get('/reports/low-stock', [ReportController::class, 'lowStock']);
});