<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('products')->whereNull('cost_price')->exists()) {
            throw new RuntimeException(
                'Cannot require products.cost_price while products with an unknown cost exist. '
                .'Set each product to its actual cost before retrying this migration.'
            );
        }

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable()->change();
        });
    }
};
