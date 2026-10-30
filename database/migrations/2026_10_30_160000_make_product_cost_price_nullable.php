<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('products')->whereNull('cost_price')->exists()) {
            throw new \RuntimeException('Cannot make products.cost_price required while products with an unknown cost exist.');
        }

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->nullable(false)->change();
        });
    }
};
