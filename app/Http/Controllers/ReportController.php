<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function lowStock()
    {
        $products = Product::query()
            ->where('active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->get();

        return ProductResource::collection($products);
    }
}
