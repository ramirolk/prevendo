<?php

namespace App\Http\Requests;

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
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],

            'name' => ['required', 'string', 'max:255'],

            'description' => ['nullable', 'string'],

            'sale_price' => [
                'required',
                'numeric',
                'min:0',
                'gte:cost_price',
            ],

            'cost_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'minimum_stock' => ['required', 'integer', 'min:0'],
        ];
    }
}
