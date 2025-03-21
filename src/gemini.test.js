const { analyzeImage } = require('./gemini');
const fetch = require('node-fetch');

// Mock the fetch function for testing
jest.mock('node-fetch');

describe('Gemini Image Analysis', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should successfully analyze an image and return text', async () => {
    const mockImageUrl = 'https://example.com/image.png';
    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // Example base64 for a 1x1 transparent pixel
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'This is a test image description.',
              },
            ],
          },
        },
      ],
    };

    // Mock the fetch calls
    fetch.mockResolvedValueOnce({
      arrayBuffer: jest.fn().mockResolvedValueOnce(Buffer.from(mockBase64, 'base64')),
    }).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await analyzeImage(mockImageUrl);

    expect(result).toBe('This is a test image description.');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, mockImageUrl);
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('https://'), expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    }));
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.contents[0].parts[0].text).toBe("What is this image about?");
    expect(body.contents[0].parts[1].inlineData.data).toBe(mockBase64);
    expect(body.contents[0].parts[1].inlineData.mimeType).toBe("image/png");
  });

  it('should handle errors when fetching the image', async () => {
    const mockImageUrl = 'https://example.com/image.png';

    // Mock the fetch call to throw an error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(analyzeImage(mockImageUrl)).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenNthCalledWith(1, mockImageUrl);
  });

  it('should handle errors from the Gemini API', async () => {
    const mockImageUrl = 'https://example.com/image.png';
    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // Example base64 for a 1x1 transparent pixel
    const mockErrorResponse = {
      error: {
        message: 'Gemini API error',
      },
    };

    // Mock the fetch calls
    fetch.mockResolvedValueOnce({
      arrayBuffer: jest.fn().mockResolvedValueOnce(Buffer.from(mockBase64, 'base64')),
    }).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValueOnce(mockErrorResponse),
    });

    await expect(analyzeImage(mockImageUrl)).rejects.toThrow('Gemini API error');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, mockImageUrl);
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('https://'), expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    }));
  });

  it('should handle unexpected response format from Gemini API', async () => {
    const mockImageUrl = 'https://example.com/image.png';
    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // Example base64 for a 1x1 transparent pixel
    const mockBadResponse = {};

    // Mock the fetch calls
    fetch.mockResolvedValueOnce({
      arrayBuffer: jest.fn().mockResolvedValueOnce(Buffer.from(mockBase64, 'base64')),
    }).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockBadResponse),
    });

    await expect(analyzeImage(mockImageUrl)).rejects.toThrow(TypeError);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, mockImageUrl);
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('https://'), expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    }));
  });
});
