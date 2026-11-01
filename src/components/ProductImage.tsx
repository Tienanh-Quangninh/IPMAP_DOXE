import PartArt from './PartArt';
import type { Product } from '../types';
export default function ProductImage({ product }: { product: Product }) {
  return product.image.startsWith('/') ? (
    <img
      className="product-photo"
      src={product.image}
      alt={product.name}
      loading="lazy"
      width="300"
      height="300"
    />
  ) : (
    <PartArt type={product.image} />
  );
}
