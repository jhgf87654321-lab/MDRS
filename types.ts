
export enum View {
  HOME = 'home',
  WARDROBE = 'wardrobe',
  TRY_ON = 'try_on',
  CREATOR = 'creator',
  STORE = 'store',
  NEW_RELEASES = 'new_releases',
  CART = 'cart',
  COLLECTION = 'collection'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  type: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface BiometricState {
  muscularity: number;
  definition: number;
  proportions: number;
}
