-- tiles 데이터 삽입 (게임판 칸 정보)
INSERT
IGNORE INTO tiles
(name, type, land_price, house_price, building_price, hotel_price, description) VALUES

('익산', 'NORMAL', 200000, 80000, 160000, 240000, '일반 도시'),
('순천', 'NORMAL', 250000, 100000, 200000, 300000, '일반 도시'),
('아산', 'NORMAL', 300000, 120000, 240000, 360000, '일반 도시'),
('청주', 'NORMAL', 350000, 140000, 280000, 420000, '일반 도시'),
('천안', 'NORMAL', 400000, 160000, 320000, 480000, '일반 도시'),
('목포', 'NORMAL', 450000, 180000, 360000, 540000, '일반 도시'),
('여수', 'NORMAL', 500000, 200000, 400000, 600000, '일반 도시'),
('나주', 'NORMAL', 550000, 220000, 440000, 660000, '일반 도시'),
('포항', 'NORMAL', 600000, 240000, 480000, 720000, '일반 도시'),
('김천', 'NORMAL', 650000, 260000, 520000, 780000, '일반 도시'),
('대구', 'NORMAL', 700000, 280000, 560000, 840000, '일반 도시'),
('수원', 'NORMAL', 750000, 300000, 600000, 900000, '일반 도시'),
('울산', 'NORMAL', 800000, 320000, 640000, 960000, '일반 도시'),
('고양', 'NORMAL', 900000, 360000, 720000, 1080000, '일반 도시'),
('창원', 'NORMAL', 1000000, 400000, 800000, 1200000, '일반 도시'),
('성남', 'NORMAL', 1100000, 440000, 880000, 1320000, '일반 도시'),
('과천', 'NORMAL', 1200000, 480000, 960000, 1440000, '일반 도시'),
('하남', 'NORMAL', 1350000, 540000, 1080000, 1620000, '일반 도시'),
('인천', 'NORMAL', 1500000, 600000, 1200000, 1800000, '일반 도시');


-- cards 데이터 삽입 (찬스카드)
-- 천사카드는 비활성화됨 (DB에 없음)
INSERT
IGNORE INTO cards (name, card_type, description, effect_type, effect_value, is_immediate)
VALUES
-- 이슈 카드들 (즉발)
('복권 당첨', 'ISSUE', '50만원 획득', 'MONEY', 5000000, true),
('사기 피해', 'ISSUE', '50만원 손실', 'MONEY', -5000000, true),
('세금 납부', 'ISSUE', '보유 현금의 15% 납부', 'MONEY_PERCENT', 15, true),
('감옥행', 'ISSUE', '즉시 감옥으로 이동', 'JAIL', 0, true),
-- 게임 카드들 (즉발)
('시작점 이동', 'GAME_CARD', '시작점으로 이동하여 월급 받기', 'POSITION', 0, true),
('앞으로 3칸', 'GAME_CARD', '3칸 앞으로 이동', 'MOVE', 3, true),
('뒤로 2칸', 'GAME_CARD', '2칸 뒤로 이동', 'MOVE', -2, true),
-- 금융정책 카드들
('금리 인상', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 감소', 'ALL_MONEY_PERCENT', 10, true),
('금리 인하', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 증가', 'ALL_MONEY_PERCENT', 10, true),
('부동산 호황', 'FINANCIAL_POLICY', '모든 땅값이 20% 상승', 'LAND_VALUE', 20, true),
('부동산 불황', 'FINANCIAL_POLICY', '모든 땅값이 20% 하락', 'LAND_VALUE', 20, true),
('경기 침체', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 15% 감소', 'ALL_MONEY_PERCENT', 15, true),
('경기 호황', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 15% 증가', 'ALL_MONEY_PERCENT', 15, true);

-- 경제 역사 효과 템플릿 데이터 (밸런스 조정 및 개수 축소)
-- 게임 진행 시 EconomicHistoryService에서 시대별로 랜덤 선택됩니다.

-- 📌 각 시대별 호황/불황 1개씩만 유지, 밸런스 조정
INSERT IGNORE INTO economic_effects (
    room_id, current_period, effect_name, description, is_boom,
    salary_multiplier, property_price_multiplier, building_cost_multiplier,
    game_turn, remaining_turns
) VALUES
-- 근대사 호황: 산업혁명
('template-modern-boom', 'MODERN', '산업혁명', '산업혁명과 2차 산업혁명으로 공업화, 철강·화학·전기 산업 발달, 세계 무역이 확대되고 있습니다.', true, 1.5, 1.2, 1.2, 1, 2),
-- 근대사 불황: 1873년 장기불황
('template-modern-recession', 'MODERN', '1873년 장기불황', '경기침체로 안전자산인 부동산으로 자금이 몰리고 있습니다.', false, 1.0, 1.1, 0.9, 1, 2),

-- 근현대사 호황: 광란의 20년대
('template-contemporary-boom', 'CONTEMPORARY', '광란의 20년대', '1920년대 미국 중심의 대량생산과 소비 호황으로 경제가 급성장하고 있습니다.', true, 1.6, 1.3, 1.3, 3, 2),
-- 근현대사 불황: 1929년 대공황
('template-contemporary-recession', 'CONTEMPORARY', '1929년 대공황', '경제 불안으로 금과 부동산 등 안전자산 수요가 급증하고 있습니다.', false, 0.5, 1.2, 0.8, 3, 2),

-- 현대사 호황: 세계화와 IT혁명
('template-recent-boom', 'RECENT', '세계화와 IT혁명', '1980~90년대 세계화와 IT혁명으로 정보통신과 금융자유화가 경제성장을 이끌고 있습니다.', true, 1.7, 1.4, 1.4, 5, 2),
-- 현대사 불황: 글로벌 금융위기
('template-recent-recession', 'RECENT', '글로벌 금융위기', '금융위기로 투자자들이 안전자산인 부동산으로 몰리고 있습니다.', false, 0.5, 1.3, 0.7, 5, 2),

-- 미래 호황: 4차 산업혁명
('template-future-boom', 'FUTURE', '4차 산업혁명', 'AI, 로봇, 바이오 혁신으로 4차 산업혁명이 새로운 경제성장을 이끌고 있습니다.', true, 1.8, 1.5, 1.5, 7, 2),
-- 미래 불황: 기후·자원 위기
('template-future-recession', 'FUTURE', '기후·자원 위기', '자원 부족으로 실물자산인 부동산 가치가 상승하고 있습니다.', false, 0.5, 1.4, 0.7, 7, 2);

-- user 데이터 삽입
INSERT
IGNORE INTO user (
    email, password, name, nickname, role, provider, icon
) VALUES
      ('user1@example.com', 'password1', 'User One', 'userone', 'USER', 'GOOGLE', NULL),
      ('user2@example.com', 'password2', 'User Two', 'usertwo', 'USER', 'KAKAO', NULL),
      ('user3@example.com', 'password3', 'User Three', 'userthree', 'USER', 'GOOGLE', NULL),
      ('user4@example.com', 'password4', 'User Four', 'userfour', 'USER', 'KAKAO', NULL),
      ('user5@example.com', 'password5', 'User Five', 'userfive', 'ADMIN', 'GOOGLE', NULL),
      ('user6@example.com', 'password6', 'User Six', 'usersix', 'USER', 'KAKAO', NULL);
