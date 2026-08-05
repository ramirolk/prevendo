<?php

use App\Enums\StockMovementType;

class StockMovement extends Model
{
    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
        ];
    }
}