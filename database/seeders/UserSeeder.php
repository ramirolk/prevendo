<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Owner Test',
            'email' => 'owner@prevendo.test',
            'password' => 'password',
            'role' => UserRole::OWNER,
        ]);

        User::factory()->create([
            'name' => 'Employee Test',
            'email' => 'employee@prevendo.test',
            'password' => 'password',
            'role' => UserRole::EMPLOYEE,
        ]);
    }
}
