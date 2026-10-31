<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'sale_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'cost_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'minimum_stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'active' => ['sometimes', 'required', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('sale_price') || $validator->errors()->has('cost_price')) {
                    return;
                }

                $product = $this->route('product');
                $salePrice = $this->input('sale_price', $product->sale_price);
                $costPrice = $this->input('cost_price', $product->cost_price);

                if ((float) $salePrice < (float) $costPrice) {
                    $validator->errors()->add(
                        'sale_price',
                        'The sale price must be greater than or equal to the cost price.'
                    );
                }
            },
        ];
    }
}
