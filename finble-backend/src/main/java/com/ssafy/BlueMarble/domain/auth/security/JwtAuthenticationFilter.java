package com.ssafy.BlueMarble.domain.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BlueMarble.global.common.response.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final RedisTemplate<String, String> redisTemplate;
    private final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            CustomUserDetailsService customUserDetailsService,
            RedisTemplate<String, String> redisTemplate) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.customUserDetailsService = customUserDetailsService;
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String token = resolveToken(request);

            if (token != null) {
                if (!jwtTokenProvider.validateToken(token)) {
                    log.info("유효하지 않은 JWT 토큰입니다.");
                    setErrorResponse(response, HttpStatus.UNAUTHORIZED, "유효하지 않은 JWT 토큰입니다.");
                    return;
                }

                String email = jwtTokenProvider.getEmail(token);
                String sessionIdFromToken = jwtTokenProvider.getSessionId(token);
                String savedRefreshToken = redisTemplate.opsForValue().get("RT:" + email);

                if (savedRefreshToken != null) {
                    String sessionIdFromRedis = jwtTokenProvider.getSessionId(savedRefreshToken);
                    if (!sessionIdFromToken.equals(sessionIdFromRedis)) {
                        setErrorResponse(response, HttpStatus.UNAUTHORIZED, "다른 기기에서 로그인되었습니다.");
                        return;
                    }
                }

                var userDetails = customUserDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            filterChain.doFilter(request, response);

        } catch (Exception ex) {
            log.error("JWT 인증 처리 중 예외 발생", ex);
            setErrorResponse(response, HttpStatus.UNAUTHORIZED, "JWT 인증 처리 중 오류가 발생했습니다.");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/auth/")
                || path.startsWith("/swagger-ui/")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/h2-console/")
                || path.equals("/");
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private void setErrorResponse(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json;charset=UTF-8");

        var errorBody = new ErrorResponse(message);

        String json = objectMapper.writeValueAsString(errorBody);
        response.getWriter().write(json);
        response.getWriter().flush();
        response.getWriter().close();
    }
}