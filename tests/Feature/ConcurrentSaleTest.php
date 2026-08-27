<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ConcurrentSaleTest extends TestCase
{
    private ?Product $product = null;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.mysql.database' => 'laravel']);
        config(['database.connections.mysql_secondary.database' => 'laravel']);

        DB::purge('mysql');
        DB::purge('mysql_secondary');
    }

    protected function tearDown(): void
    {
        if (DB::connection('mysql')->transactionLevel() > 0) {
            DB::connection('mysql')->rollBack();
        }

        $this->product?->delete();

        parent::tearDown();
    }

    public function test_lock_for_update_blocks_concurrent_access_to_same_row(): void
    {
        $this->product = Product::factory()->create();
        $this->product->forceFill(['current_stock' => 10])->save();

        DB::connection('mysql')->beginTransaction();

        DB::connection('mysql')
            ->table('products')
            ->where('id', $this->product->id)
            ->lockForUpdate()
            ->first();

        DB::connection('mysql_secondary')
            ->statement('SET SESSION innodb_lock_wait_timeout = 1');

        $lockWasBlocked = false;

        try {
            DB::connection('mysql_secondary')
                ->table('products')
                ->where('id', $this->product->id)
                ->lockForUpdate()
                ->first();
        } catch (QueryException $e) {
            if ($e->errorInfo[1] === 1205) {
                $lockWasBlocked = true;
            } else {
                throw $e;
            }
        }

        $this->assertTrue($lockWasBlocked);

        DB::connection('mysql')->commit();

        $lockedProduct = DB::connection('mysql_secondary')
            ->table('products')
            ->where('id', $this->product->id)
            ->lockForUpdate()
            ->first();

        $this->assertNotNull($lockedProduct);

        DB::connection('mysql_secondary')->commit();
    }
}
