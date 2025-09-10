-- Initial data for Finble game
-- Note: cities table does not exist, commenting out data insertion

-- cities 데이터 삽입 (주석 처리: cities 테이블이 존재하지 않음)
-- INSERT IGNORE INTO cities (name, korean_name, price)
-- VALUES ('IKSAN', '익산', 50),
--        ('SUNCHEON', '순천', 60),
--        ('ASAN', '아산', 70),
--        ('BUSAN', '부산', 200),
--        ('CHEONGJU', '청주', 90),
--        ('CHEONAN', '천안', 100),
--        ('MOKPO', '목포', 110),
--        ('YEOSU', '여수', 120),
--        ('NAJU', '나주', 130),
--        ('GWANGJU', '광주', 180),
--        ('POHANG', '포항', 150),
--        ('GIMCHEON', '김천', 160),
--        ('DAEGU', '대구', 170),
--        ('GUMI', '구미', 160),
--        ('DAEJEON', '대전', 180),
--        ('SUWON', '수원', 200),
--        ('INCHEON', '인천', 210),
--        ('GOYANG', '고양', 220),
--        ('CHANGWON', '창원', 230),
--        ('SEOUL', '서울', 220),
--        ('SEONGNAM', '성남', 250),
--        ('GWACHEON', '과천', 270),
--        ('HANAM', '하남', 285),
--        ('INCHEON2', '인천', 300);

-- tiles 데이터 삽입 (게임판 칸 정보)
INSERT IGNORE INTO tiles (id, name, type, land_price, house_price, building_price, hotel_price, description) VALUES
-- 시작칸
(0, '시작', 'START', 0, 0, 0, 0, '지나가거나 도착하면 월급 받음'),

-- 일반땅 (1~2)
(1, '익산', 'NORMAL', 50, 20, 35, 50, '일반 도시'),
(2, '순천', 'NORMAL', 60, 25, 40, 60, '일반 도시'),

-- 찬스칸 (3)
(3, '찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (1번째 줄)'),

-- 일반땅 (4)
(4, '아산', 'NORMAL', 70, 28, 48, 70, '일반 도시'),

-- 싸피특별땅 (5)
(5, '부산', 'SPECIAL', 200, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 일반땅 (6)
(6, '청주', 'NORMAL', 90, 36, 63, 90, '일반 도시'),

-- 감옥 (7)
(7, '감옥', 'JAIL', 0, 0, 0, 0, '3턴간 이동 불가, 보석금으로 탈출 가능'),

-- 일반땅 (8~10)
(8, '천안', 'NORMAL', 100, 40, 70, 100, '일반 도시'),
(9, '목포', 'NORMAL', 110, 45, 77, 110, '일반 도시'),
(10, '여수', 'NORMAL', 120, 48, 84, 120, '일반 도시'),

-- 찬스칸 (11)
(11, '찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (2번째 줄)'),

-- 일반땅 (12)
(12, '나주', 'NORMAL', 130, 52, 91, 130, '일반 도시'),

-- 싸피특별땅 (13)
(13, '광주', 'SPECIAL', 180, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 박람회 (14)
(14, '박람회', 'EXHIBITION', 0, 0, 0, 0, '전체 땅 값 일정 배율만큼 증가'),

-- 일반땅 (15~17)
(15, '포항', 'NORMAL', 150, 60, 105, 150, '일반 도시'),
(16, '김천', 'NORMAL', 160, 64, 112, 160, '일반 도시'),
(17, '대구', 'NORMAL', 170, 68, 119, 170, '일반 도시'),

-- 싸피특별땅 (18)
(18, '구미', 'SPECIAL', 160, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 찬스칸 (19)
(19, '찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (3번째 줄)'),

-- 싸피특별땅 (20)
(20, '대전', 'SPECIAL', 180, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 비행기 (21)
(21, '비행기', 'AIRPLANE', 0, 0, 0, 0, '일정 금액 지불하고 원하는 땅으로 이동'),

-- 일반땅 (22~25)
(22, '수원', 'NORMAL', 200, 80, 140, 200, '일반 도시'),
(23, '인천', 'NORMAL', 210, 84, 147, 210, '일반 도시'),
(24, '고양', 'NORMAL', 220, 88, 154, 220, '일반 도시'),
(25, '창원', 'NORMAL', 230, 92, 161, 230, '일반 도시'),

-- 싸피특별땅 (26)
(26, '서울', 'SPECIAL', 220, 0, 0, 0, '싸피특별땅 - 건설 불가'),

-- 찬스칸 (27)
(27, '찬스', 'CHANCE', 0, 0, 0, 0, '찬스카드 뽑기 (4번째 줄)'),

-- 일반땅 (28~31)
(28, '성남', 'NORMAL', 250, 100, 175, 250, '일반 도시'),
(29, '과천', 'NORMAL', 270, 108, 189, 270, '일반 도시'),
(30, '하남', 'NORMAL', 285, 114, 199, 285, '일반 도시'),
(31, '인천', 'NORMAL', 300, 120, 210, 300, '일반 도시');

-- cards 데이터 삽입 (찬스카드)
INSERT IGNORE INTO cards (name, card_type, description, effect_value)
VALUES
-- 천사카드 (보유 가능)
('천사카드', 'ANGEL', '부정적인 효과가 발생할 때 사용하여 회피 가능', 0),

-- 금융정책 카드들 (즉발)
('금리 인상', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 감소', 10),
('금리 인하', 'FINANCIAL_POLICY', '모든 플레이어의 현금이 10% 증가', 10),
('부동산 호황', 'FINANCIAL_POLICY', '모든 땅값이 20% 상승', 20),
('부동산 불황', 'FINANCIAL_POLICY', '모든 땅값이 20% 하락', 20),

-- 이슈 카드들 (즉발)
('세금 납부', 'ISSUE', '보유 현금의 15% 납부', 15),
('복권 당첨', 'ISSUE', '50만원 획득', 500000),
('사기 피해', 'ISSUE', '30만원 손실', 300000),
('감옥행', 'ISSUE', '즉시 감옥으로 이동', 0),

-- 게임 카드들 (즉발)
('시작점 이동', 'GAME_CARD', '시작점으로 이동하여 월급 받기', 0),
('무료 건설', 'GAME_CARD', '다음 건설 시 50% 할인', 50),
('땅값 동결', 'GAME_CARD', '3턴간 모든 통행료 면제', 3),
('강제 이주', 'GAME_CARD', '상대방을 원하는 위치로 이동', 0);

-- user 데이터 삽입
INSERT IGNORE INTO user (
    id, email, name, nickname, password, provider, role, fcm_token
) VALUES
      (1, 'user1@example.com', 'User One', 'userone', 'password1', 'GOOGLE', 'USER', 'fcm_token_1'),
      (2, 'user2@example.com', 'User Two', 'usertwo', 'password2', 'KAKAO', 'USER', 'fcm_token_2'),
      (3, 'user3@example.com', 'User Three', 'userthree', 'password3', 'GOOGLE', 'USER', 'fcm_token_3'),
      (4, 'user4@example.com', 'User Four', 'userfour', 'password4', 'KAKAO', 'USER', 'fcm_token_4'),
      (5, 'user5@example.com', 'User Five', 'userfive', 'password5', 'GOOGLE', 'ADMIN', 'fcm_token_5'),
      (6, 'user6@example.com', 'User Six', 'usersix', 'password6', 'KAKAO', 'USER', 'fcm_token_6');