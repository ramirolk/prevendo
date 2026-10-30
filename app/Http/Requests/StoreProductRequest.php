<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'category_id' => ['required', 'integer', 'exists:categories,id'],

            'name' => ['required', 'string', 'max:255'],

            'description' => ['nullable', 'string'],

            'sale_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'minimum_stock' => ['required', 'integer', 'min:0'],
        ];

        if ($this->user()->role === UserRole::OWNER) {
            $rules['cost_price'] = ['required', 'numeric', 'min:0'];
            $rules['sale_price'][] = 'gte:cost_price';
        } else {
            $rules['cost_price'] = ['missing'];
        }

        return $rules;
    }
}
