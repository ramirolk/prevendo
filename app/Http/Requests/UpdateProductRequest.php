<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
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
            'category_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'sale_price' => [
                'sometimes',
                'required',
                'numeric',
                'min:0',
            ],

            'minimum_stock' => [
                'sometimes',
                'required',
                'integer',
                'min:0',
            ],

        ];

        $rules['cost_price'] = $this->user()->role === UserRole::OWNER
            ? ['sometimes', 'required', 'numeric', 'min:0']
            : ['missing'];

        $rules['active'] = $this->user()->role === UserRole::OWNER
            ? ['sometimes', 'required', 'boolean']
            : ['missing'];

        return $rules;
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $product = $this->route('product');

                $salePrice = $this->input(
                    'sale_price',
                    $product->sale_price
                );

                $costPrice = $this->input(
                    'cost_price',
                    $product->cost_price
                );

                if ($costPrice !== null && (float) $salePrice < (float) $costPrice) {
                    $validator->errors()->add(
                        'sale_price',
                        'The sale price must be greater than or equal to the cost price.'
                    );
                }
            },
        ];
    }
}
