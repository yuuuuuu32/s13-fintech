-- tiles 데이터 삽입 (게임판 칸 정보)
INSERT
IGNORE INTO tiles
(name, type, land_price, house_price, building_price, hotel_price, description) VALUES

('신안', 'NORMAL', 40, 10, 25, 40, '일반 도시'),
('익산', 'NORMAL', 50, 20, 35, 50, '일반 도시'),
('순천', 'NORMAL', 60, 25, 40, 60, '일반 도시'),
('아산', 'NORMAL', 70, 28, 48, 70, '일반 도시'),
('청주', 'NORMAL', 90, 36, 63, 90, '일반 도시'),
('천안', 'NORMAL', 100, 40, 70, 100, '일반 도시'),
('목포', 'NORMAL', 110, 45, 77, 110, '일반 도시'),
('여수', 'NORMAL', 120, 48, 84, 120, '일반 도시'),
('나주', 'NORMAL', 130, 52, 91, 130, '일반 도시'),
('포항', 'NORMAL', 150, 60, 105, 150, '일반 도시'),
('김천', 'NORMAL', 160, 64, 112, 160, '일반 도시'),
('대구', 'NORMAL', 170, 68, 119, 170, '일반 도시'),
('수원', 'NORMAL', 200, 80, 140, 200, '일반 도시'),
('울산', 'NORMAL', 210, 84, 147, 210, '일반 도시'),
('고양', 'NORMAL', 220, 88, 154, 220, '일반 도시'),
('창원', 'NORMAL', 230, 92, 161, 230, '일반 도시'),
('성남', 'NORMAL', 250, 100, 175, 250, '일반 도시'),
('과천', 'NORMAL', 270, 108, 189, 270, '일반 도시'),
('하남', 'NORMAL', 285, 114, 199, 285, '일반 도시'),
('인천', 'NORMAL', 300, 120, 210, 300, '일반 도시');


-- cards 데이터 삽입 (찬스카드)
-- 천사카드는 비활성화됨 (DB에 없음)
INSERT
IGNORE INTO cards (name, card_type, description, effect_type, effect_value, is_immediate)
VALUES
-- 이슈 카드들 (즉발)
('복권 당첨', 'ISSUE', '50만원 획득', 'MONEY', 500000, true),
('사기 피해', 'ISSUE', '30만원 손실', 'MONEY', -300000, true),
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