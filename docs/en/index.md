---
layout: home

hero:
  name: api-datamodel
  text: Turn backend endpoints into business APIs
  tagline: Use Services to unify boundaries, request rules, and types so application code depends only on stable business capabilities.
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/introduction
    - theme: alt
      text: API Codegen
      link: /en/codegen/

features:
  - title: Business API Modeling
    details: Organize stable entry points such as userApi and orderApi by business module instead of scattering URLs and request details across pages.
  - title: Unified Request Handling
    details: Centralize paths, defaults, response transformation, loading states, messages, errors, and cancellation.
  - title: OpenAPI Code Generation
    details: Generate types and business APIs that use the same model when an OpenAPI document is available.
---

## Core Model

```text
Backend API
     ↓
  Service
     ↓
Business API
     ↓
Application Code
```

A Service defines the service boundary, while business APIs expose concrete capabilities:

```ts
await userApi.list({ page: 1 })
await orderApi.submit(data)
```

Application code no longer assembles URLs or repeatedly handles the same request rules.

## Already Have OpenAPI?

Codegen supports API modeling and produces the same kind of business API:

```text
OpenAPI → API Codegen → TypeScript Types + Business APIs
```

Start with the [Introduction](/en/guide/introduction) to understand the model, or go directly to [API Codegen](/en/codegen/) if you already have OpenAPI.
