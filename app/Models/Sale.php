<?php

use App\Enums\SaleStatus;

class Sale extends Model
{
    protected function casts(): array
    {
        return [
            'status' => SaleStatus::class,
        ];
    }
}