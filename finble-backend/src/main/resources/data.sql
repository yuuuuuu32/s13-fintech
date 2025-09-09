-- 기본 도시 데이터 (tiles -> cities로 변환)
INSERT INTO cities (name, korean_name, price) VALUES
('IKSAN', '익산', 50),
('SUNCHEON', '순천', 60),
('ASAN', '아산', 70),
('BUSAN', '부산', 200),
('CHEONGJU', '청주', 90),
('CHEONAN', '천안', 100),
('MOKPO', '목포', 110),
('YEOSU', '여수', 120),
('NAJU', '나주', 130),
('GWANGJU', '광주', 180),
('POHANG', '포항', 150),
('GIMCHEON', '김천', 160),
('DAEGU', '대구', 170),
('GUMI', '구미', 160),
('DAEJEON', '대전', 180),
('SUWON', '수원', 200),
('INCHEON', '인천', 210),
('GOYANG', '고양', 220),
('CHANGWON', '창원', 230),
('SEOUL', '서울', 220),
('SEONGNAM', '성남', 250),
('GWACHEON', '과천', 270),
('HANAM', '하남', 285),
('INCHEON2', '인천', 300);

-- 찬스카드 데이터
INSERT INTO chance_cards (card_type, name, description, effect_type, effect_value, is_immediate) VALUES
-- 천사카드 (보유 가능)
('ANGEL', '천사카드', '부정적인 효과가 발생할 때 사용하여 회피 가능', 'AVOID_NEGATIVE', 0, false),

-- 금융정책 카드들 (즉발)
('FINANCIAL_POLICY', '금리 인상', '모든 플레이어의 현금이 10% 감소', 'MONEY_DECREASE', 10, true),
('FINANCIAL_POLICY', '금리 인하', '모든 플레이어의 현금이 10% 증가', 'MONEY_INCREASE', 10, true),
('FINANCIAL_POLICY', '부동산 호황', '모든 땅값이 20% 상승', 'LAND_PRICE_UP', 20, true),
('FINANCIAL_POLICY', '부동산 불황', '모든 땅값이 20% 하락', 'LAND_PRICE_DOWN', 20, true),

-- 이슈 카드들 (즉발)
('ISSUE', '세금 납부', '보유 현금의 15% 납부', 'TAX', 15, true),
('ISSUE', '복권 당첨', '50만원 획득', 'MONEY_GAIN', 500000, true),
('ISSUE', '사기 피해', '30만원 손실', 'MONEY_LOSS', 300000, true),
('ISSUE', '감옥행', '즉시 감옥으로 이동', 'GO_TO_JAIL', 0, true),

-- 게임 카드들 (즉발)
('GAME_CARD', '시작점 이동', '시작점으로 이동하여 월급 받기', 'GO_TO_START', 0, true),
('GAME_CARD', '무료 건설', '다음 건설 시 50% 할인', 'BUILD_DISCOUNT', 50, true),
('GAME_CARD', '땅값 동결', '3턴간 모든 통행료 면제', 'TOLL_FREEZE', 3, true),
('GAME_CARD', '강제 이주', '상대방을 원하는 위치로 이동', 'MOVE_OPPONENT', 0, true);

-- 게임 엔티티 더미 데이터: cities
INSERT INTO cities (name, korean_name, price) VALUES
('IKSAN', '익산', 120),
('BUSAN', '부산', 300),
('SEOUL', '서울', 450)
ON DUPLICATE KEY UPDATE price = VALUES(price);

-- 게임 엔티티 더미 데이터: cards
INSERT INTO cards (card_name, card_type, description, effect_value) VALUES
('천사 보호', 'ANGEL', '부정 효과 1회 면역', NULL),
('즉시 이동', 'INSTANT', '시작으로 이동하여 월급 받기', 0),
('현금 보너스', 'INSTANT', '현금 100 증가', 100)
ON DUPLICATE KEY UPDATE description = VALUES(description), effect_value = VALUES(effect_value);

-- ID를 고정해 tempLogin 등에서 참조 가능하도록 함
INSERT INTO `user` (id, email, password, name, nickname, role, provider, fcm_token, name_tag, icon) VALUES
(1, 'test1@example.com', '{noop}pass', '테스터원', 'tester1', 'USER', 'GOOGLE', NULL, NULL, NULL),
(2, 'admin@example.com', '{noop}admin', '관리자', 'admin1', 'ADMIN', 'GOOGLE', NULL, NULL, NULL);