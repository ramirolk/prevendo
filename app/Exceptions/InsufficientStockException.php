<?php

namespace App\Exceptions;

use Exception;

class InsufficientStockException extends Exception
{
    public function __construct(string $message, public readonly int $productId)
    {
        parent::__construct($message);
    }
}
