import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { productsAPI } from '../api/endpoints';

const Debug = () => {
  const [productsResponse, setProductsResponse] = useState(null);
  const [searchResponse, setSearchResponse] = useState(null);

  const testProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProductsResponse(response.data);
    } catch (error) {
      setProductsResponse({ error: error.message, details: error.response?.data });
    }
  };

  const testSearch = async () => {
    try {
      const response = await productsAPI.search('bota');
      setSearchResponse(response.data);
    } catch (error) {
      setSearchResponse({ error: error.message, details: error.response?.data });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">🔍 Debug - Respuestas del Backend</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Products */}
          <Card title="GET /api/v1/products">
            <Button onClick={testProducts} className="mb-4">
              Probar Endpoint
            </Button>
            {productsResponse && (
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(productsResponse, null, 2)}
              </pre>
            )}
          </Card>

          {/* Test Search */}
          <Card title="GET /api/v1/products/search?q=bota">
            <Button onClick={testSearch} className="mb-4">
              Probar Búsqueda
            </Button>
            {searchResponse && (
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(searchResponse, null, 2)}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Debug;