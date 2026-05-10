import React, { useState } from 'react';

const StarRating = ({ rating, setRating }) => {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            cursor: 'pointer',
            color: star <= rating ? '#FFD700' : '#ccc',
            fontSize: 24,
          }}
          onClick={() => setRating(star)}
          data-testid={`star-${star}`}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ProductComments = ({ productId, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0 || comment.trim() === '') return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment }),
      });
      if (!res.ok) throw new Error('Failed to submit comment');
      if (onSubmit) onSubmit({ rating, comment });
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err.message || 'Error submitting comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <label>
        Rating:
        <StarRating rating={rating} setRating={setRating} />
      </label>
      <div style={{ margin: '12px 0' }}>
        <label>
          Comment:
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="Write your comment here..."
            required
          />
        </label>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={rating === 0 || comment.trim() === '' || loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};

export default ProductComments;