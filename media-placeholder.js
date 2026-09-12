// 레시피에 사진/영상이 하나도 없을 때 쓰는 공용 플레이스홀더.
// 모든 리스트/카드(feed, ranking, 홈 추천, 내 레시피 목록)에서 동일하게 재사용해
// "사진 없음"이 실제 스톡 사진으로 보이지 않고 명확히 구분되게 한다.
// className에 카드별 크기 클래스(예: 'feed-card-img')를 추가로 넘길 수 있다.
function recipeThumbHtml(recipe, { alt = '', extraClass = '' } = {}) {
  const url = recipe?.image || (recipe?.media && recipe.media[0]);
  if (url) {
    return `<img class="${extraClass}" src="${url}" alt="${alt}" loading="lazy" />`;
  }
  return `<div class="${extraClass} thumb-placeholder" role="img" aria-label="${alt || '사진 없음'}"><span>🍳</span></div>`;
}

window.recipeThumbHtml = recipeThumbHtml;
