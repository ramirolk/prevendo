<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return[
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'description' => $this->description,
            'sale_price' => $this->sale_price,
            'cost_price' => $this->when(
                $request->user()->role === UserRole::OWNER,
                $this->cost_price
            ),
            'minimum_stock' => $this->minimum_stock,
            'current_stock' => $this->current_stock,
            'active' => $this->active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
