import { GraphQLClient, gql } from "graphql-request";

const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const token = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const endpoint = `https://${domain}/api/2024-10/graphql.json`;

const client = new GraphQLClient(endpoint, {
  headers: {
    "X-Shopify-Storefront-Access-Token": token,
    "Content-Type": "application/json",
  },
});

export interface ShopifyImage {
  url: string;
  altText: string | null;
}

export interface ShopifyPrice {
  amount: string;
  currencyCode: string;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: ShopifyPrice;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  vendor: string;
  productType: string;
  createdAt: string;
  options: { name: string; values: string[] }[];
  featuredImage: ShopifyImage | null;
  priceRange: {
    minVariantPrice: ShopifyPrice;
    maxVariantPrice: ShopifyPrice;
  };
  images: {
    edges: { node: ShopifyImage }[];
  };
  variants: {
    edges: {
      node: ShopifyVariant;
    }[];
  };
}

const PRODUCTS_QUERY = gql`
  query Products($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = gql`
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      availableForSale
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 25) {
        edges {
          node {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

export async function getProducts(first = 20): Promise<ShopifyProduct[]> {
  const data = await client.request<{
    products: { edges: { node: ShopifyProduct }[] };
  }>(PRODUCTS_QUERY, { first });

  return data.products.edges.map((edge) => edge.node);
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface PaginatedProducts {
  products: ShopifyProduct[];
  pageInfo: PageInfo;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image: ShopifyImage | null;
  products: {
    edges: { node: ShopifyProduct }[];
    pageInfo: PageInfo;
  };
}

const COLLECTION_BY_HANDLE_QUERY = gql`
  query CollectionByHandle($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
    collectionByHandle(handle: $handle) {
      id
      title
      handle
      description
      image {
        url
        altText
      }
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
        edges {
          node {
            id
            title
            handle
            description
            vendor
            productType
            createdAt
            availableForSale
            options {
              name
              values
            }
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = gql`
  query Collections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

export async function getCollections(
  first = 20,
): Promise<ShopifyCollection[]> {
  const data = await client.request<{
    collections: { edges: { node: ShopifyCollection }[] };
  }>(COLLECTIONS_QUERY, { first });

  return data.collections.edges.map((edge) => edge.node);
}

export async function getCollectionByHandle(
  handle: string,
  first = 20,
  sortKey?: string,
  reverse?: boolean,
  after?: string,
): Promise<ShopifyCollection | null> {
  const data = await client.request<{
    collectionByHandle: ShopifyCollection | null;
  }>(COLLECTION_BY_HANDLE_QUERY, { handle, first, sortKey, reverse, after });

  return data.collectionByHandle;
}

export async function getCollectionProducts(
  handle: string,
  first = 20,
  after?: string,
  sortKey?: string,
  reverse?: boolean,
): Promise<PaginatedProducts> {
  const collection = await getCollectionByHandle(handle, first, sortKey, reverse, after);
  if (!collection) return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
  return {
    products: collection.products.edges.map((e) => e.node),
    pageInfo: collection.products.pageInfo,
  };
}

export async function getProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  const data = await client.request<{
    productByHandle: ShopifyProduct | null;
  }>(PRODUCT_BY_HANDLE_QUERY, { handle });

  return data.productByHandle;
}

const PRODUCT_RECOMMENDATIONS_QUERY = gql`
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      vendor
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

export async function getProductRecommendations(
  productId: string,
): Promise<ShopifyProduct[]> {
  const data = await client.request<{
    productRecommendations: ShopifyProduct[];
  }>(PRODUCT_RECOMMENDATIONS_QUERY, { productId });

  return data.productRecommendations || [];
}

export function formatPrice(price: ShopifyPrice): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currencyCode,
  }).format(parseFloat(price.amount));
}

// Cart

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: {
    edges: {
      node: {
        id: string;
        quantity: number;
        merchandise: {
          id: string;
          title: string;
          product: {
            title: string;
            handle: string;
            featuredImage: ShopifyImage | null;
          };
          price: ShopifyPrice;
        };
      };
    }[];
  };
  cost: {
    totalAmount: ShopifyPrice;
    subtotalAmount: ShopifyPrice;
  };
}

const CART_FRAGMENT = gql`
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product {
                title
                handle
                featuredImage {
                  url
                  altText
                }
              }
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
    cost {
      totalAmount {
        amount
        currencyCode
      }
      subtotalAmount {
        amount
        currencyCode
      }
    }
  }
`;

const CREATE_CART_MUTATION = gql`
  ${CART_FRAGMENT}
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ADD_TO_CART_MUTATION = gql`
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const REMOVE_FROM_CART_MUTATION = gql`
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_CART_QUERY = gql`
  ${CART_FRAGMENT}
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFields
    }
  }
`;

export async function createCart(
  variantId: string,
  quantity = 1,
): Promise<ShopifyCart> {
  const data = await client.request<{
    cartCreate: { cart: ShopifyCart };
  }>(CREATE_CART_MUTATION, {
    lines: [{ merchandiseId: variantId, quantity }],
  });

  return data.cartCreate.cart;
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<ShopifyCart> {
  const data = await client.request<{
    cartLinesAdd: { cart: ShopifyCart };
  }>(ADD_TO_CART_MUTATION, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });

  return data.cartLinesAdd.cart;
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[],
): Promise<ShopifyCart> {
  const data = await client.request<{
    cartLinesRemove: { cart: ShopifyCart };
  }>(REMOVE_FROM_CART_MUTATION, { cartId, lineIds });

  return data.cartLinesRemove.cart;
}

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await client.request<{
    cart: ShopifyCart | null;
  }>(GET_CART_QUERY, { cartId });

  return data.cart;
}

const UPDATE_CART_LINES_MUTATION = gql`
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function updateCartLines(
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<ShopifyCart> {
  const data = await client.request<{
    cartLinesUpdate: { cart: ShopifyCart };
  }>(UPDATE_CART_LINES_MUTATION, { cartId, lines });
  return data.cartLinesUpdate.cart;
}

// Search

export interface SearchResult {
  products: ShopifyProduct[];
  pageInfo: PageInfo;
  totalCount: number;
}

const PREDICTIVE_SEARCH_QUERY = gql`
  query PredictiveSearch($query: String!, $first: Int!) {
    predictiveSearch(query: $query, limit: $first, types: [PRODUCT]) {
      products {
        id
        title
        handle
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

const SEARCH_PRODUCTS_QUERY = gql`
  query SearchProducts($query: String!, $first: Int!, $after: String) {
    search(query: $query, first: $first, after: $after, types: [PRODUCT]) {
      edges {
        node {
          ... on Product {
            id
            title
            handle
            description
            vendor
            productType
            availableForSale
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export async function predictiveSearch(
  query: string,
  first = 6,
): Promise<ShopifyProduct[]> {
  const data = await client.request<{
    predictiveSearch: { products: ShopifyProduct[] };
  }>(PREDICTIVE_SEARCH_QUERY, { query, first });
  return data.predictiveSearch.products;
}

export async function searchProducts(
  query: string,
  first = 20,
  after?: string,
): Promise<SearchResult> {
  const data = await client.request<{
    search: {
      edges: { node: ShopifyProduct }[];
      pageInfo: PageInfo;
      totalCount: number;
    };
  }>(SEARCH_PRODUCTS_QUERY, { query, first, after });
  return {
    products: data.search.edges.map((e) => e.node),
    pageInfo: data.search.pageInfo,
    totalCount: data.search.totalCount,
  };
}
