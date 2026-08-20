<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if ($request->user()->role->value !== $role) {
            abort(403, 'You do not have permission to perform this action.');
        }
        
        return $next($request);
    }
}
