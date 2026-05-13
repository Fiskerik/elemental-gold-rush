import { ProductId } from "./products";

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  console.log("Purchase requested through platform layer", { productId });
  return false;
}

export async function restorePurchases(): Promise<ProductId[]> {
  console.log("Purchase restore requested through platform layer");
  return [];
}
