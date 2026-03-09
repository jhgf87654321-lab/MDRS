
export enum View {
  HOME = 'home',
  WARDROBE = 'wardrobe',
  TRY_ON = 'try_on',
  CREATOR = 'creator',
  STORE = 'store',
  NEW_RELEASES = 'new_releases',
  CART = 'cart',
  COLLECTION = 'collection',
  ADMIN = 'admin',
  SHARE_HUB = 'share_hub',
  CREATE_POST = 'create_post'
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
