<?php

namespace App\Enums;

enum StockMovementType: string
{
    case SALE = 'sale';
    case CANCELLATION = 'cancellation';
    case ADJUSTMENT = 'adjustment';
}